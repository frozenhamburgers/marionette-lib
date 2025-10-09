package net.jelly.marionette_lib.entity.examples.wyvern;

import net.jelly.marionette_lib.utility.ProceduralAnimatable;
import net.jelly.marionette_lib.utility.FabrikAnimator;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.monster.Phantom;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;

public class WyvernEntity extends Phantom implements ProceduralAnimatable {
    private final WyvernPartEntity[] allBodyParts;
    private final WyvernPartEntity[] allParts;
    FabrikAnimator bodyAnimator;
    Vec3 restPos = new Vec3(999, 999, 999);

    FabrikAnimator[] legAnimators = new FabrikAnimator[4];
    boolean[] legStatus = new boolean[4];

    public WyvernEntity(EntityType entityType, Level level) {
        super(entityType, level);
        WyvernPartEntity tail1Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail2Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail3Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail4Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail5Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail6Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail7Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail8Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail9Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail10Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        allBodyParts = new WyvernPartEntity[]{tail1Part, tail2Part, tail3Part, tail4Part, tail5Part, tail6Part, tail7Part, tail8Part, tail9Part, tail10Part};
        bodyAnimator = new FabrikAnimator(this, allBodyParts);
        bodyAnimator.setFollowRootOnly(true);

        WyvernPartEntity leg1Part1 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        WyvernPartEntity leg1Part2 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        WyvernPartEntity leg2Part1 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        WyvernPartEntity leg2Part2 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        WyvernPartEntity leg3Part1 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        WyvernPartEntity leg3Part2 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        WyvernPartEntity leg4Part1 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        WyvernPartEntity leg4Part2 = new WyvernPartEntity(this, 0.25F, 0.25F, 1f);
        legAnimators[0] = new FabrikAnimator(this, new WyvernPartEntity[]{leg1Part1, leg1Part2});
        legAnimators[1] = new FabrikAnimator(this, new WyvernPartEntity[]{leg2Part1, leg2Part2});
        legAnimators[2] = new FabrikAnimator(this, new WyvernPartEntity[]{leg3Part1, leg3Part2});
        legAnimators[3] = new FabrikAnimator(this, new WyvernPartEntity[]{leg4Part1, leg4Part2});

        // allParts must still have all parts
        allParts = new WyvernPartEntity[]{tail1Part, tail2Part, tail3Part, tail4Part, tail5Part, tail6Part, tail7Part, tail8Part, tail9Part, tail10Part,
                leg1Part1, leg1Part2, leg2Part1, leg2Part2, leg3Part1, leg3Part2, leg4Part1, leg4Part2};
    }

    @Override
    public ArrayList<FabrikAnimator> getAnimators() {
        ArrayList<FabrikAnimator> animators = new ArrayList<>();
        animators.add(bodyAnimator);
        animators.add(legAnimators[0]);
        animators.add(legAnimators[1]);
        animators.add(legAnimators[2]);
        animators.add(legAnimators[3]);
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

        for (int i=0; i<4; i++) {
            FabrikAnimator legAnimator = legAnimators[i];
            int rootIndex;
            if(i <= 1) rootIndex = 1;
            else rootIndex = 5;
            WyvernPartEntity rootPart = allBodyParts[rootIndex];
            int bodySide = 1;
            if(i%2 == 0) bodySide = -1;

            legAnimator.setRoot(rootPart.position());
            Vec3 direction = allBodyParts[rootIndex-1].position().subtract(rootPart.position()).normalize();
            Vec3 legRest = rootPart.position()
                    .add(direction.cross(new Vec3(0, 1, 0)).normalize().scale(1.5f*bodySide))
                    .add(direction.normalize().scale(1.25f));
            restPos = legRest;

            if (legAnimator.chainEndPos().distanceTo(restPos) > 2f) {
                legStatus[i] = true;
            }

            if (legStatus[i]) {
                legAnimator.setFabrikTarget(legAnimator.chainEndPos()
                        .add(restPos.subtract(legAnimator.chainEndPos()).normalize()
                                .scale(this.getDeltaMovement().dot(restPos.subtract(legAnimator.chainEndPos()))))
                        .add(restPos.subtract(legAnimator.chainEndPos()).scale(0.25))
                        .add(restPos.subtract(legAnimator.chainEndPos()).normalize().scale(0.1))
                );
                if (legAnimator.chainEndPos().distanceTo(restPos) < 0.6) {
                    System.out.println("cancelled returning: " + legAnimator.chainEndPos().distanceTo(restPos));
                    legStatus[i] = false;
                }
            }

            System.out.println(legAnimator.chainEndPos().distanceTo(restPos));
        }

        tickMultipart();
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

    @Override
    protected boolean isSunBurnTick() {
        return false;
    }

    @Override
    protected InteractionResult mobInteract(Player pPlayer, InteractionHand pHand) {
        if(this.level().isClientSide) Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch client"));
        else Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch server"));
        return super.mobInteract(pPlayer, pHand);
    }
}
