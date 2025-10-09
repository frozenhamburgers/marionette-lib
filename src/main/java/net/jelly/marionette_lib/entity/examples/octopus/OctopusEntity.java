package net.jelly.marionette_lib.entity.examples.octopus;

import net.jelly.marionette_lib.utility.AbstractPartEntity;
import net.jelly.marionette_lib.utility.ProceduralAnimatable;
import net.jelly.marionette_lib.utility.FabrikAnimator;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.animal.WaterAnimal;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;

public class OctopusEntity extends WaterAnimal implements ProceduralAnimatable {
    private final OctopusPartEntity[] allParts;
    private OctopusPartEntity[] tentacleParts1;
    private OctopusPartEntity[] tentacleParts2;
    FabrikAnimator animator1;
    FabrikAnimator animator2;
    Vec3 target1;
    Vec3 target2;
    Vec3 goal1;
    Vec3 goal2;

    private OctopusPartEntity[] createTentacle() {
        OctopusPartEntity tentaclePart1 = new OctopusPartEntity(this, 16f/16, 16f/16, 16f/16);
        OctopusPartEntity tentaclePart2 = new OctopusPartEntity(this, 16f/16, 16f/16, 16f/16);
        OctopusPartEntity tentaclePart3 = new OctopusPartEntity(this, 16f/16, 16f/16, 16f/16);
        OctopusPartEntity tentaclePart4 = new OctopusPartEntity(this, 16f/16, 16f/16, 16f/16);
        OctopusPartEntity tentaclePart5 = new OctopusPartEntity(this, 12f/16, 12f/16, 12f/16);
        OctopusPartEntity tentaclePart6 = new OctopusPartEntity(this, 12f/16, 12f/16, 12f/16);
        OctopusPartEntity tentaclePart7 = new OctopusPartEntity(this, 12f/16, 12f/16, 12f/16);
        OctopusPartEntity tentaclePart8 = new OctopusPartEntity(this, 12f/16, 12f/16, 12f/16);
        OctopusPartEntity tentaclePart9 = new OctopusPartEntity(this, 10f/16, 10f/16, 10f/16);
        OctopusPartEntity tentaclePart10 = new OctopusPartEntity(this, 10f/16, 10f/16, 10f/16);
        OctopusPartEntity tentaclePart11 = new OctopusPartEntity(this, 10f/16, 10f/16, 10f/16);
        OctopusPartEntity tentaclePart12 = new OctopusPartEntity(this, 10f/16, 10f/16, 10f/16);
        OctopusPartEntity tentaclePart13 = new OctopusPartEntity(this, 10f/16, 10f/16, 10f/16);
        OctopusPartEntity tentaclePart14 = new OctopusPartEntity(this, 10f/16, 10f/16, 10f/16);
        OctopusPartEntity tentaclePart15 = new OctopusPartEntity(this, 10f/16, 10f/16, 10f/16);
        OctopusPartEntity[] parts  = new OctopusPartEntity[]
                {tentaclePart1, tentaclePart2, tentaclePart3, tentaclePart4, tentaclePart5, tentaclePart6, tentaclePart7,
                        tentaclePart8, tentaclePart9, tentaclePart10, tentaclePart11, tentaclePart12, tentaclePart13, tentaclePart14,
                        tentaclePart15};
        return parts;
    }

    public OctopusEntity(EntityType entityType, Level level) {
        super(entityType, level);
        tentacleParts1 = createTentacle();
        animator1 = new FabrikAnimator(this, tentacleParts1);
        tentacleParts2 = createTentacle();
        animator2 = new FabrikAnimator(this, tentacleParts2);

        // allParts must still have all parts
        allParts = new OctopusPartEntity[tentacleParts1.length + tentacleParts2.length];
        System.arraycopy(tentacleParts1, 0, allParts, 0, tentacleParts1.length);
        System.arraycopy(tentacleParts2, 0, allParts, tentacleParts1.length, tentacleParts2.length);

        // set initial goal to initial end of chain
        target1 = allParts[tentacleParts1.length + tentacleParts2.length-1].getEndPos();
        target2 = target1;
        goal1 = findNextGoal(tentacleParts1);
        goal2 = findNextGoal(tentacleParts2);
    }

    @Override
    public ArrayList<FabrikAnimator> getAnimators() {
        ArrayList<FabrikAnimator> animators = new ArrayList<>();
        animators.add(animator1);
        animators.add(animator2);
        return animators;
    }
    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public @Nullable PartEntity<?>[] getParts() {
        return allParts;
    }

    public void remove(RemovalReason removalReason) {
        super.remove(removalReason);
        if (allParts != null) {
            for (PartEntity part : allParts) {
                part.remove(RemovalReason.KILLED);
            }
        }
    }

    public void tick() {
        super.tick();
        if(Math.abs(goal1.subtract(target1).length()) <= 0.5) {
            goal1 = findNextGoal(tentacleParts1);
        }
        if(Math.abs(goal2.subtract(target2).length()) <= 0.5) goal2 = findNextGoal(tentacleParts2);
        target1 = target1.add(goal1.subtract(target1).normalize().scale(0.5));
        target2 = target2.add(goal2.subtract(target2).normalize().scale(0.5));

        animator1.setFabrikTarget(target1);
        animator2.setFabrikTarget(target2);
        tickMultipart();
    }

    private Vec3 findNextGoal(OctopusPartEntity[] tentacle) {
        while(true) {
            Vec3 endPos = tentacle[tentacle.length - 1].getEndPos();
            Vec3 proposedTarget = endPos.add(new Vec3(20 * (Math.random() * 2 - 1), 20 * (Math.random() * 2 - 1), 20 * (Math.random() * 2 - 1)));
            Vec3 rootPos = this.position();

            float totalLength = 0;
            for (AbstractPartEntity part : tentacle) totalLength += part.getLength();
            float distToTarget = (float) (proposedTarget.subtract(rootPos).length());

            if (distToTarget < totalLength && proposedTarget.y > this.position().y+3) {
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
