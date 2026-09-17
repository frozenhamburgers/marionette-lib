package net.jelly.marionette_lib.entity.examples.octopus;

import net.jelly.marionette_lib.utility.Limb;
import net.jelly.marionette_lib.utility.Marionette;
import net.jelly.marionette_lib.utility.MarionettePart;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.animal.WaterAnimal;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;

import java.util.List;

public class OctopusEntity extends WaterAnimal implements Marionette {
    private final Limb<MarionettePart<OctopusEntity>> tentacle1;
    private final Limb<MarionettePart<OctopusEntity>> tentacle2;
    private Vec3 target1;
    private Vec3 target2;
    private Vec3 goal1;
    private Vec3 goal2;

    private Limb<MarionettePart<OctopusEntity>> createTentacle() {
        // tapers from 1-block-thick segments down to 10/16-block-thick segments
        return Limb.builder(this)
                .segments(4, 16f / 16, 16f / 16, 16f / 16)
                .segments(4, 12f / 16, 12f / 16, 12f / 16)
                .segments(7, 10f / 16, 10f / 16, 10f / 16)
                .build();
    }

    public OctopusEntity(EntityType entityType, Level level) {
        super(entityType, level);
        tentacle1 = createTentacle();
        tentacle2 = createTentacle();

        // set initial goal to initial end of chain
        target1 = tentacle1.animator().chainEndPos();
        target2 = tentacle2.animator().chainEndPos();
        goal1 = findNextGoal(tentacle1);
        goal2 = findNextGoal(tentacle2);
    }

    @Override
    public List<Limb<?>> getLimbs() {
        return List.of(tentacle1, tentacle2);
    }

    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public PartEntity<?>[] getParts() {
        return getMarionetteParts();
    }

    @Override
    public void remove(RemovalReason removalReason) {
        super.remove(removalReason);
        removeMarionette(removalReason);
    }

    public void tick() {
        super.tick();
        if (Math.abs(goal1.subtract(target1).length()) <= 0.5) goal1 = findNextGoal(tentacle1);
        if (Math.abs(goal2.subtract(target2).length()) <= 0.5) goal2 = findNextGoal(tentacle2);
        target1 = target1.add(goal1.subtract(target1).normalize().scale(0.5));
        target2 = target2.add(goal2.subtract(target2).normalize().scale(0.5));

        tentacle1.animator().setFabrikTarget(target1);
        tentacle2.animator().setFabrikTarget(target2);
        tickMarionette();
    }

    private Vec3 findNextGoal(Limb<MarionettePart<OctopusEntity>> tentacle) {
        while (true) {
            Vec3 endPos = tentacle.animator().chainEndPos();
            Vec3 proposedTarget = endPos.add(new Vec3(20 * (Math.random() * 2 - 1), 20 * (Math.random() * 2 - 1), 20 * (Math.random() * 2 - 1)));
            Vec3 rootPos = this.position();

            float totalLength = 0;
            for (MarionettePart<OctopusEntity> part : tentacle.parts()) totalLength += part.getLength();
            float distToTarget = (float) (proposedTarget.subtract(rootPos).length());

            if (distToTarget < totalLength && proposedTarget.y > this.position().y + 3) {
                return proposedTarget;
            }
        }
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Animal.createLivingAttributes()
                .add(Attributes.MAX_HEALTH, 20D)
                .add(Attributes.FOLLOW_RANGE, 24D)
                .add(Attributes.MOVEMENT_SPEED, 0.25D)
                .add(Attributes.ARMOR_TOUGHNESS, 0.1f)
                .add(Attributes.ATTACK_KNOCKBACK, 0.5f)
                .add(Attributes.ATTACK_DAMAGE, 2f);
    }
}
